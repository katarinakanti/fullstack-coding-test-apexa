def find_intersection(A,B):
    # Time complexity: O(n) dimana n adalah jumlah elemen pada list A
    set_A = set(A)
    # Time complexity: O(1) karena insiasi adalah constant time
    # Space complexity: 0(n) jika diasumsikan semua element pada A bersifat unique
    set_intersect = set()

    # Time complexity: O(m) anggap jumlah anggota pada B adalah m
    for element in B:
    # Time complexity: O(1) anggap jumlah anggota pada A adalah n                   
        if element in set_A:
            # Time complexity: O(1) karena dihitung setiap ada elemnt yang setara
            # Space complexity: O(min(n,m)) --> O(n)              
            set_intersect.add(element)    
        # Time complexity: O(min(n,m)) dimana best case adalah 0(1) dimana salah satu dari array A atau B kosong, atau mengeprint semua element dari array yang lebih pendek
        # Space complexity: O(min(n,m)) --> O(n) 
    return list(set_intersect)


#Konklusi
# Time complexity: O(n) + O(1) + O(m)xO(1) + O(min(n,m)) --> akan tetapi jika n=1000 dan m=5, waktu iterasi akan lebih besar di n sehingga O(min(n,m)) belum akurat:
# ^sehingga O(n+M) karena setiap element harus dilalui sekali
# Space complexity: O(n) --> O(1) dari inisirasi set(A)